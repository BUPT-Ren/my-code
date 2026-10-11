import torchvision
from torchvision.utils import make_grid
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter
#准备的测试数据集
test_data = torchvision.datasets.CIFAR10(root='./data',
                                         train=False,
                                         transform=torchvision.transforms.ToTensor())
'''



参数	当前值	含义	影响
dataset	test_data	要加载的数据集	必须是你之前创建的 Dataset 对象
batch_size	4	每批返回的样本数	每次迭代得到4张图像和4个标签
shuffle	True	是否打乱顺序	测试时通常设为 False
num_workers	0	子进程数量	0=主进程加载，>0=多进程加速
drop_last	False	是否丢弃最后不完整批次	False=保留剩余样本

'''
#shuffle:随即洗牌
'''

test_loader 按照batch_size 打包  imgs = [img_1,img_2,img_3,img_4]
targets = [taget_1,target_2,target_3,target_4]
'''
test_loader = DataLoader(dataset=test_data,batch_size=64,
                         shuffle=True,num_workers = 0,drop_last=False)


#测试数据集中第一张样本

img,target = test_data[0]

print(img)
print(target)

step = 0
writer = SummaryWriter('logs')

for epoch in range(2):
    for data in test_loader:
        imgs,targets = data
        print(imgs.shape)
        print(targets)
        writer.add_image('data_test_{}'.format(epoch),
                         make_grid(imgs),global_step=step,
                         dataformats='CHW')
        step = step + 1

writer.close()