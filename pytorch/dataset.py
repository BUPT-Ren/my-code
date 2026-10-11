import torchvision
from PIL import Image
from torchvision.transforms import ToPILImage
from torch.utils.tensorboard import SummaryWriter
dataset_transform = torchvision.transforms.Compose([torchvision.transforms.ToTensor()])
# 50000张
train_set = torchvision.datasets.CIFAR10(root='./data',train = True,
                                         transform=dataset_transform,download = True)
#10000张
test_set = torchvision.datasets.CIFAR10(root='./data',train=False,
                                        transform=dataset_transform,download = True)

# print(len(train_set),len(test_set))
#  看到三个 [[[ 开头，就把它拆成 三块（RGB），每块里面看 行，行里面看 列。
# print(train_set[0])  #类别 6
# print(test_set[0])   #类别 3

img,target = train_set[0]
# print('img=',img,'target=',target)
# print(test_set.classes)
#
# print(test_set.targets)
# print(test_set.classes[target])
to_PIL = ToPILImage()
img_PIL = to_PIL(img)
'''
类型	获取尺寸的方法	示例输出
PyTorch 张量	.shape	torch.Size([3, 32, 32])
PIL 图像	.size	(32, 32)

类型	属性	输出示例	含义
PIL 图像	.size	(32, 32)	(宽度, 高度)
PIL 图像	.mode	'RGB'	通道模式
PyTorch 张量	.shape	torch.Size([3, 32, 32])	(通道, 高度, 宽度)
NumPy 数组	.shape	(32, 32, 3)	(高度, 宽度, 通道)

'''
writer = SummaryWriter('logs')
for i in range(10):
    img,target = train_set[i]  #图片+标签
    writer.add_image('img',img,global_step=i)

writer.close()
print(img_PIL.size)
img_PIL.show()