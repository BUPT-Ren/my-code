

#利用LENET网络来实现缺陷检测

import pathlib #
import numpy as np #导入路径方式
import pandas as pd
import matplotlib.pyplot as plt
import keras
from keras.layers import Dense,Flatten,Conv2D,MaxPooling2D
'''
| 层                  | 作用                          |
| ------------------ | --------------------------- |
| **`Conv2D`**       | 二维卷积层，提取图像的局部特征（如边缘、纹理）     |
| **`MaxPooling2D`** | 最大池化层，降低特征图尺寸，减少计算量，增强平移不变性 |
| **`Flatten`**      | 展平层，将多维特征图转换为一维向量，用于连接全连接层  |
| **`Dense`**        | 全连接层（密集层），进行分类或回归的最终决策      |

'''
#中文处理
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axis.unicode_minus'] = False


#读取训练集数据
data_train='这里写入路径'
data_train=pathlib.Path(data_train)  #将路径转换成Path对象

#读取验证集的数据
data_val='这里写入路径'
data_val=pathlib.Path(data_val)  #将路径转换成Path对象

#给数据类别放置到列表数据中

CLASS_NAME=np.array['','','','','','','']

#设置图片大小和批次数

#LENET只接受32*32大小的图片

BATCH_SIZE=32
IMG_HEIGHT=32
IMG_WIDTH=32

#对数据进行归一化处理 0-255

image_generator=keras.preprocessing.image.ImageDataGenerator(rescale=1./255)
'''

| 部分                          | 含义                 |
| :-------------------------- | :----------------- |
| `keras.preprocessing.image` | Keras 图像预处理模块      |
| `ImageDataGenerator`        | **图像数据生成器类**（驼峰命名） |
| `rescale=1./255`            | 归一化参数：所有像素值除以 255  |

'''

#训练集的生成器

train_data_gan=image_generator.flow_from_directory(
directory=str(data_train),batch_size=BATCH_SIZE,
    shuffle=True,target_size=(IMG_HEIGHT,IMG_WIDTH),classes=list(CLASS_NAME))

print(train_data_gan)

'''
| 参数            | 作用               | 示例值              |
| :------------ | :--------------- | :--------------- |
| `directory`   | 训练数据**根目录**路径    | `'./data/train'` |
| `batch_size`  | 每批加载的图像数量        | `32`             |
| `shuffle`     | 每轮是否随机打乱数据       | `True`（训练时通常开启）  |
| `target_size` | 将所有图像resize到统一尺寸 | `(150, 150)`     |
| `classes`     | 指定类别顺序（可选）       | `['cat', 'dog']` |

'''

#验证集生成器
val_data_gan=image_generator.flow_from_directory(
directory=str(data_val),batch_size=BATCH_SIZE,
    shuffle=True,target_size=(IMG_HEIGHT,IMG_WIDTH),classes=list(CLASS_NAME))

print(val_data_gan)

#利用keras搭建卷积神经网络

model=keras.Sequential()
model.add(Conv2D(filters=6,kernel_size=5,input_shape=(32,32,3),activation='relu'))
'''
默认步长为1

| 参数            | 值           | 含义                         |
| :------------ | :---------- | :------------------------- |
| `filters`     | `6`         | 卷积核数量，提取6种不同特征             |
| `kernel_size` | `5`         | 5×5的滑动窗口（可写`(5,5)`或简写`5`）  |
| `input_shape` | `(32,32,3)` | 输入尺寸：高32×宽32×3通道，**仅首层需要** |
| `activation`  | `'relu'`    | 负值归零，增加非线性                 |

'''

'''
原始图像 (32×32)          6个卷积核提取不同特征           输出6张特征图
┌────────┐               ┌───┐ ┌───┐ ┌───┐            ┌───┐┌───┐┌───┐
│        │    5×5窗口滑动 │   │ │   │ │   │ ...        │   ││   ││   │
│  RGB   │  ─────────→   │ 6 │ │ 6 │ │ 6 │    =       │ 6 ││ 6 ││ 6 │
│  3通道  │               │ 个 │ │ 个 │ │ 个 │            │ 张 ││ 张 ││ 张 │
│        │               │核1│ │核2│ │核3│            │图1││图2││图3│...
└────────┘               └───┘ └───┘ └───┘            └───┘└───┘└───┘
                            ...共6个卷积核              (28×28×6)
'''

model.add(MaxPooling2D(pool_size=(2,2),strides=(2,2)))

'''
| 参数          | 值        | 含义              |
| :---------- | :------- | :-------------- |
| `pool_size` | `(2, 2)` | 池化窗口大小：2×2像素区域  |
| `strides`   | `(2, 2)` | 每次移动2个像素（不重叠池化） |

输入特征图 (4×4)          2×2池化窗口              输出特征图 (2×2)
┌───┬───┬───┬───┐
│ 1 │ 3 │ 2 │ 4 │    ┌───┐              ┌───┬───┐
├───┼───┼───┼───┤    │1 3│ 取max=3  →   │ 3 │ 4 │
│ 5 │ 2 │ 6 │ 1 │    │5 2│              ├───┼───┤
├───┼───┼───┼───┤    └───┘              │ 8 │ 6 │
│ 7 │ 8 │ 3 │ 5 │        ┌───┐         └───┴───┘
├───┼───┼───┼───┤        │2 4│ 取max=4
│ 2 │ 4 │ 8 │ 6 │        │6 1│
└───┴───┴───┴───┘        └───┘
        步长2 →    ┌───┐
                   │7 8│ 取max=8
                   │2 4│
                   └───┘

'''
model.add(Conv2D(filters=16,kernel_size=5,activation='relu'))

model.add(MaxPooling2D(pool_size=(2,2),strides=(2,2)))

model.add(Conv2D(filters=120,kernel_size=5,activation='relu'))

model.add(Flatten())

'''

| 层                  | 操作 | 输出尺寸           | 计算            |
| :----------------- | :- | :------------- | :------------ |
| 输入                 | -  | `(32, 32, 3)`  | 原始图像          |
| Conv2D(6, 5)       | 卷积 | `(28, 28, 6)`  | 32-5+1=28     |
| MaxPooling2D       | 池化 | `(14, 14, 6)`  | 28/2=14       |
| **Conv2D(16, 5)**  | 卷积 | `(10, 10, 16)` | **14-5+1=10** |
| MaxPooling2D       | 池化 | `(5, 5, 16)`   | 10/2=5        |
| **Conv2D(120, 5)** | 卷积 | `(1, 1, 120)`  | **5-5+1=1**   |
| **Flatten**        | 展平 | `(120,)`       | 1×1×120=120   |

'''

#全连接层
model.add(Dense(84,activation='relu'))
model.add(Dense(6,activation='softmax'))

#编译网络 optimizer：SGD
#adam： 选择adam是由于在实验中这种优化器表现较优
model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

'''
| 参数          | 值                            | 作用                    |
| :---------- | :--------------------------- | :-------------------- |
| `loss`      | `'categorical_crossentropy'` | 多分类损失函数（标签为one-hot编码） |
| `optimizer` | `'adam'`                     | 自适应学习率优化算法            |
| `metrics`   | `['accuracy']`               | 训练时监控准确率              |

'''


#传入数据集进行训练
history=model.fit(train_data_gan,validation_data=val_data_gan,epochs=10)

'''
| 参数                | 值     | 作用            |
| :---------------- | :---- | :------------ |
| `train_data_gan`  | 生成器对象 | 提供训练批次（图像+标签） |
| `validation_data` | 验证生成器 | 每轮结束后评估模型性能   |
| `epochs`          | `10`  | 完整遍历训练数据10次   |

'''

#保存训练好的模型

model.save('model.h5')

#绘制loss值图

plt.plot(history.history['loss'],label='train')

plt.plot(history.history['val_loss'],label='val')
'''
history          ← model.fit() 返回的对象（History 类实例）
    │
    └── .history  ← 属性，内部字典，存着所有数值记录
            │
            ├── 'loss': [2.3, 1.5, 0.9, ...]         列表
            ├── 'accuracy': [0.3, 0.6, 0.8, ...]     列表
            ├── 'val_loss': [2.5, 1.6, 1.0, ...]     列表
            └── 'val_accuracy': [0.25, 0.55, ...]     列表
'''
plt.title('model loss')
plt.legend()
plt.show()

#绘制准确率

plt.plot(history.history['accuracy'],label='train')
plt.plot(history.history['val_accuracy'],label='val')

plt.title('model accuracy')
plt.legend()
plt.show()

